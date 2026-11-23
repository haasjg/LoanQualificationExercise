import { Decision, ReasonCode } from '../engine/types';

interface QuietStatusBadgeProps {
  decision: Decision;
  reasonCode: ReasonCode | null;
}

export function QuietStatusBadge({ decision, reasonCode }: QuietStatusBadgeProps) {
  const getStatusInfo = () => {
    if (decision === Decision.APPROVED) {
      return {
        label: 'You may qualify',
        bgColor: 'bg-emerald-100',
        textColor: 'text-emerald-800',
        borderColor: 'border-emerald-200',
      };
    } else if (decision === Decision.COUNTER_OFFER) {
      // Map counter-offer reason to plain language
      const reason = reasonCode === ReasonCode.LOAN_CAP_EXCEEDED
        ? 'Amount exceeds tier limit'
        : 'DTI slightly elevated';
      
      return {
        label: reason,
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-800',
        borderColor: 'border-amber-200',
      };
    } else {
      // DECLINED - map reason codes to single plain-language phrases
      let reason = 'Does not meet criteria';
      
      if (reasonCode === ReasonCode.HIGH_RISK_SCORE) {
        reason = 'Credit score below minimum';
      } else if (reasonCode === ReasonCode.INSUFFICIENT_INCOME) {
        reason = 'Income below threshold';
      } else if (reasonCode === ReasonCode.EXCESSIVE_DEBT) {
        reason = 'Debt exceeds income';
      } else if (reasonCode === ReasonCode.HIGH_DTI) {
        reason = 'DTI too high';
      }
      
      return {
        label: reason,
        bgColor: 'bg-rose-100',
        textColor: 'text-rose-800',
        borderColor: 'border-rose-200',
      };
    }
  };

  const { label, bgColor, textColor, borderColor } = getStatusInfo();

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold border ${bgColor} ${textColor} ${borderColor}`}
    >
      {label}
    </span>
  );
}
