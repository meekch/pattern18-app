interface DisclaimerProps {
    variant?: "banner" | "box" | "inline" | "footer";
    className?: string;
  }
  
  export default function LegalDisclaimer({ variant = "box", className = "" }: DisclaimerProps) {
    if (variant === "banner") {
      return (
        <div className={`bg-yellow-50 border-b border-yellow-200 px-4 py-2 ${className}`}>
          <p className="text-xs text-yellow-700 text-center">
            <strong>Important:</strong> Pattern 18 is a documentation tool, not a law firm. 
            This is not legal advice. Consult a licensed attorney before making legal decisions.
          </p>
        </div>
      );
    }
  
    if (variant === "inline") {
      return (
        <p className={`text-xs text-gray-400 ${className}`}>
          Documentation tool only • Not legal advice • Consult an attorney for legal decisions
        </p>
      );
    }
  
    if (variant === "footer") {
      return (
        <div className={`text-center py-4 ${className}`}>
          <p className="text-xs text-gray-400">
            Pattern 18 Coach is an organizational tool, not a law firm.
          </p>
          <p className="text-xs text-gray-400">
            Consult a licensed attorney in your jurisdiction for legal advice.
          </p>
        </div>
      );
    }
  
    // Default: box
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <h3 className="font-semibold text-yellow-800 mb-2">Important Notice</h3>
        <p className="text-sm text-yellow-700">
          Pattern 18 is a documentation and organizational tool, not a law firm. 
          The information and documents provided are for organizational purposes only 
          and do not constitute legal advice. Always consult with a licensed attorney 
          in your jurisdiction before making legal decisions or filing court documents.
        </p>
      </div>
    );
  }