import DashboardLayout from './(dashboard)/layout';
import CommandCenterPage from './(dashboard)/page';

export default function RootPage() {
  return (
    <DashboardLayout>
      <CommandCenterPage />
    </DashboardLayout>
  );
}
