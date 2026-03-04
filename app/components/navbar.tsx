"use client";

import Link from "next/link";
import React from "react";
import PhotoIcon from "@assets/photo_icon.svg";
import Dice_1 from "@assets/dice-twenty-faces-one.svg";
import Dice_2 from "@assets/dice-twenty-faces-twenty.svg";
import Image from "next/image";
import { usePathname } from "next/navigation";

const Navbar: React.FC = () => {
  const [diceHovered, setDiceHovered] = React.useState(false);
  const pathName = usePathname();
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-gray-200 text-gray-800 shadow-lg w-full max-w-full min-w-full">
      <div className="flex items-center">
        <Link href="/">
          <Image
            src={PhotoIcon}
            alt="Logo"
            width={40}
            height={40}
            className="mr-2 hover:scale-105 transition-transform duration-300 ease-in-out cursor-pointer"
          />
        </Link>
      </div>

      {(pathName === "/" || pathName === "/random") && (
        <button
          className="hover:scale-105 transition-transform duration-300 ease-in-out"
          onMouseEnter={() => setDiceHovered(true)}
          onMouseLeave={() => setDiceHovered(false)}
          aria-label="Random Photo Button"
          onClick={() => {
            if (pathName === "/random") {
              window.location.reload();
            } else {
              window.location.href = "/random";
            }
          }}
        >
          <Image
            src={diceHovered ? Dice_2 : Dice_1}
            alt="Random Photo"
            width={40}
            height={40}
          />
        </button>
      )}
    </nav>
  );
};

export default Navbar;
