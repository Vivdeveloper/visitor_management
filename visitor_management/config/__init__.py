"""App-level constants and feature flags."""

# Roles are not hardcoded here — assign them in Role Permission Manager per DocType.
# See Visitor Entry (and other VMS DocTypes) → Permissions / Role Permission Manager.

VISITOR_STATUSES = (
	"Pending Approval",
	"Approved",
	"Checked In",
	"Meeting Done",
	"Checked Out",
	"Rejected",
	"Cancelled",
	"Completed",
)
