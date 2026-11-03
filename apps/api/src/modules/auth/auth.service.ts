import crypto from "crypto";
import argon2 from "argon2";
import { query } from "../../db";
import { config } from "../../config";
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
} from "../../middleware/errors";

// Dummy hash for uniform timing on non-existent accounts
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$cGFzc3dvcmRzYWx0MTIz$H8sYf5g5r0N5j4/y7K7T9s8uN4pQ3vR2wX1yZ9aB0cE";

export function validatePasswordPolicy(
  password: string,
  username: string,
): { valid: boolean; message?: string } {
  if (!password || password.length < 10) {
    return { valid: false, message: "Password minimal 10 karakter." };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  if (!hasLetter || !hasDigit) {
    return {
      valid: false,
      message: "Password harus mengandung huruf dan angka.",
    };
  }
  if (password.toLowerCase() === username.toLowerCase()) {
    return {
      valid: false,
      message: "Password tidak boleh sama dengan username.",
    };
  }
  return { valid: true };
}

export async function login(
  usernameInput: string,
  passwordInput: string,
  ip?: string,
  userAgent?: string,
) {
  const username = usernameInput.trim();

  // 1. Fetch user by lower(username)
  const userResult = await query(
    `SELECT
       u.*,
       d.name as department_name,
       d.code as department_code,
       mgr.full_name as manager_name
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN users mgr ON mgr.id = u.manager_id
     WHERE lower(u.username) = lower($1)`,
    [username],
  );

  const user = userResult.rows[0];
  let isPasswordCorrect = false;

  const isAccountUnavailable =
    Boolean(user) &&
    (!user.is_active ||
      Boolean(user.locked_until && new Date(user.locked_until) > new Date()));

  if (user && !isAccountUnavailable) {
    try {
      isPasswordCorrect = await argon2.verify(
        user.password_hash,
        passwordInput,
      );
    } catch {
      isPasswordCorrect = false;
    }
  } else if (!user) {
    // Perform dummy verify to ensure uniform response time (prevent user enumeration)
    try {
      await argon2.verify(DUMMY_HASH, passwordInput);
    } catch {
      // ignore
    }
  }

  // 2. Call sp_register_login_attempt
  const attemptResult = await query(
    `SELECT sp_register_login_attempt($1, $2, $3::inet, $4) as result`,
    [username, isPasswordCorrect, ip || null, userAgent || null],
  );

  const attemptStatus = attemptResult.rows[0]?.result;

  if (attemptStatus !== "ok") {
    const code =
      attemptStatus === "locked"
        ? "ACCOUNT_LOCKED"
        : attemptStatus === "inactive"
          ? "ACCOUNT_INACTIVE"
          : "INVALID_CREDENTIALS";
    throw new UnauthorizedError("Username atau password salah.", code);
  }

  // 3. Create cryptographically secure random session token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const sessionResult = await query(
    `SELECT sp_create_session($1, $2, ($3 || ' hours')::interval, $4::inet, $5) as session_id`,
    [user.id, tokenHash, config.sessionMaxHours, ip || null, userAgent || null],
  );

  return {
    rawToken,
    sessionId: sessionResult.rows[0].session_id,
    user: {
      id: Number(user.id),
      employee_no: user.employee_no,
      full_name: user.full_name,
      email: user.email,
      username: user.username,
      department_id: Number(user.department_id),
      department_name: user.department_name,
      department_code: user.department_code || null,
      manager_id: user.manager_id ? Number(user.manager_id) : null,
      manager_name: user.manager_name || null,
      must_change_password: user.must_change_password,
      role: user.role || "assistant",
    },
  };
}

export async function logout(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await query(`SELECT sp_logout_by_token($1)`, [tokenHash]);
}

export async function changePassword(
  userId: number,
  oldPass: string,
  newPass: string,
) {
  const userResult = await query(
    `SELECT * FROM users WHERE id = $1 AND is_active = TRUE`,
    [userId],
  );
  if (userResult.rowCount === 0) {
    throw new NotFoundError("Pengguna tidak ditemukan atau tidak aktif.");
  }

  const user = userResult.rows[0];
  const isMatch = await argon2.verify(user.password_hash, oldPass);
  if (!isMatch) {
    throw new BadRequestError(
      "Password lama tidak cocok.",
      "INVALID_OLD_PASSWORD",
    );
  }

  const policy = validatePasswordPolicy(newPass, user.username);
  if (!policy.valid) {
    throw new BadRequestError(
      policy.message || "Password tidak memenuhi kebijakan.",
      "PASSWORD_POLICY_VIOLATION",
    );
  }

  const newHash = await argon2.hash(newPass, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  await query(`SELECT sp_change_password($1, $2)`, [userId, newHash]);
}
