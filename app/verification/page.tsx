import { ApiVerificationDashboard } from "@/src/components/ApiVerificationDashboard"

export default function VerificationPage() {
  return (
    <div className="container mx-auto py-8">
      <ApiVerificationDashboard autoRefresh={true} refreshInterval={60000} />
    </div>
  )
}
