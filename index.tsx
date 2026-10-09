import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => { throw redirect({ to: "/registry" }); },
  head: () => ({ meta: [
    { title: "ระบบทะเบียนครุภัณฑ์" },
    { name: "description", content: "เข้าสู่ระบบเพื่อจัดการทะเบียนและการยืมคืนครุภัณฑ์" },
    { property: "og:title", content: "ระบบทะเบียนครุภัณฑ์" },
    { property: "og:description", content: "เข้าสู่ระบบเพื่อจัดการทะเบียนและการยืมคืนครุภัณฑ์" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});