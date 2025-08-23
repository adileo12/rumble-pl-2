import dynamic from "next/dynamic";

// DO NOT export revalidate/dynamic here.
// This page renders nothing on the server; it only loads the client app.
const AdminApp = dynamic(() => import("./ui/AdminApp"), { ssr: false });

export default function Page() {
  return <AdminApp />;
}
