"use client";

import React from "react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";

interface AvatarProps {
  address: string;
  size?: number;
}

/**
 * Ethereum-style identicon using Jazzicon (same visuals MetaMask uses).
 * The component renders a colourful, unique SVG based on the address.
 */
export const Avatar: React.FC<AvatarProps> = ({ address, size = 32 }) => {
  if (!address) return null;

  const seed = jsNumberForAddress(address);

  return <Jazzicon diameter={size} seed={seed} />;
};
