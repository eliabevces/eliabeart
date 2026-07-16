import Link from "next/link";
import React from "react";
import Image from "next/image";
import PhotoIcon from "@assets/photo_icon.svg";

const SPROCKETS = Array.from({ length: 24 });

const Navbar: React.FC = () => {
  return (
    <>
      {/* sprocket strip */}
      <div
        className="flex gap-[14px] px-11 py-2"
        style={{ background: "var(--surface)" }}
      >
        {SPROCKETS.map((_, i) => (
          <div
            key={i}
            className="w-2.5 h-3.5 rounded-sm flex-shrink-0"
            style={{ background: "var(--sprocket)" }}
          />
        ))}
      </div>

      {/* navbar */}
      <nav
        className="flex items-center justify-between px-11 py-5 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <Link href="/">
          <Image
            src={PhotoIcon}
            alt="Logo"
            width={40}
            height={40}
            className="hover:scale-105 transition-transform duration-300 ease-in-out cursor-pointer"
          />
        </Link>
      </nav>
    </>
  );
};

export default Navbar;
