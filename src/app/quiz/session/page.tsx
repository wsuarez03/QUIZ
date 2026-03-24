"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectToJoin() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/quiz/join");
  }, [router]);
  return <div>Redirigiendo...</div>;
}