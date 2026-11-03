export interface AllowedActionsContext {
  user: {
    id: number;
    role?: string;
    department_id?: number;
  };
  doc: {
    status: string;
    review_stage: string | null;
    applicant_id: number;
    applicant_department_id?: number | null;
    checker_id?: number | null;
  };
  intendedDepartments: Array<{
    department_id: number;
    manager_id: number;
    passed_checker?: boolean;
  }>;
  hasVersions: boolean;
}

export interface AllowedActionsResult {
  can_create: boolean;
  can_edit: boolean;
  can_submit: boolean;
  can_delete: boolean;
  can_cancel: boolean;
  can_checker_decide: boolean;
  can_dept_decide: boolean;
  managed_department_id: number | null;
  can_add_dept: boolean;
  can_respond: boolean;
  can_print: boolean;
  is_checker_dept_conflict?: boolean;
}

export function computeAllowedActions(
  ctx: AllowedActionsContext,
): AllowedActionsResult {
  const { user, doc, intendedDepartments, hasVersions } = ctx;
  const isApplicant = Number(doc.applicant_id) === user.id;
  const isChecker = Number(doc.checker_id) === user.id;
  const isDeptManager = user.role === "dept_manager";
  const isAssistant = user.role === "assistant";

  const canEdit =
    isAssistant &&
    isApplicant &&
    doc.status === "draft" &&
    doc.review_stage === "applicant";

  const canSubmit = canEdit && intendedDepartments.length >= 1 && hasVersions;

  const canDelete = isAssistant && isApplicant && doc.status === "draft";
  const canCancel = isAssistant && isApplicant && doc.status === "pending";

  const canCheckerDecide =
    isChecker && doc.status === "draft" && doc.review_stage === "checker";

  const userManagedDept = intendedDepartments.find(
    (d) => Number(d.manager_id) === user.id && d.passed_checker,
  );
  const canDeptDecide = doc.status === "pending" && !!userManagedDept;

  const isOwnerDeptManager =
    (isDeptManager || isChecker) &&
    Number(user.department_id) === Number(doc.applicant_department_id);

  const canAddDept = doc.status === "pending" && isOwnerDeptManager;
  const canRespond =
    (doc.status === "pending" &&
      (isApplicant || isDeptManager || isOwnerDeptManager)) ||
    (doc.status === "draft" && doc.review_stage === "checker" && isChecker);
  const canPrint = ["pending", "approved", "rejected", "canceled"].includes(
    doc.status,
  );

  const isCheckerDeptConflict =
    isChecker &&
    intendedDepartments.some((d) => Number(d.manager_id) === user.id);

  return {
    can_create: isAssistant,
    can_edit: canEdit,
    can_submit: canSubmit,
    can_delete: canDelete,
    can_cancel: canCancel,
    can_checker_decide: canCheckerDecide,
    can_dept_decide: canDeptDecide,
    managed_department_id: userManagedDept
      ? Number(userManagedDept.department_id)
      : null,
    can_add_dept: canAddDept,
    can_respond: canRespond,
    can_print: canPrint,
    is_checker_dept_conflict: isCheckerDeptConflict,
  };
}
