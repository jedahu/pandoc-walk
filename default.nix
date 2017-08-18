#!/usr/bin/env nix-build

{ pkgs ? import <nixpkgs> {}, doCheck ? false, yarn-home ? "/tmp" }:

pkgs.callPackage ./derivation.nix {
  inherit doCheck yarn-home;
  pname = "ts-demonstrate-html-renderer";
}
