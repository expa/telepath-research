"use client";
import dynamic from "next/dynamic";

const blank = () => <div className="canvas3d" />;
export const Encoder3DLazy = dynamic(() => import("./encoder3d"), { ssr: false, loading: blank });
