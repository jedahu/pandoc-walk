#!/usr/bin/env nix-build

{ pkgs, doCheck, pname, yarn-home }:

with pkgs;
with builtins;
let
  copy = {echo ? false}: paths: runCommand "copy" {}
    ( ''mkdir -p "$out"
      ''
      +
      ( concatStringsSep "\n"
        ( map (p:
            let
              from = elemAt p 0;
              to = ''$out/${elemAt p 1}'';
              cmd = ''cp -r "${from}" "${to}"'';
              echo-cmd = ''
                echo ${cmd}
              '';
              run-cmd = ''
                mkdir -p "$(dirname "${to}")"
                ${cmd}
              '';
            in
              if echo
              then echo-cmd + run-cmd
              else run-cmd
            ) paths
        )
      )
    );

  node-modules = pkgs.stdenv.mkDerivation {
    name = "${pname}-node-modules";
    src = copy {} [
      [./package.json "package.json"]
      [./yarn.lock "yarn.lock"]
    ];
    phases = "unpackPhase buildPhase";
    buildInputs = [yarn];
    buildPhase = ''
      mkdir "$out"
      export HOME="${if yarn-home == "" then "$out/.yarn-home" else yarn-home}"
      exec yarn --pure-lockfile --modules-folder "$out"
    '';
  };

  dist = pkgs.stdenv.mkDerivation {
    inherit doCheck;
    name = pname;
    src = copy {} [
      [./src "src"]
      [./tsconfig.json "tsconfig.json"]
      [./tsconfig.prod.json "tsconfig.prod.json"]
      [./package.json "package.json"]
      [./yarn.lock "yarn.lock"]
      [node-modules "node_modules"]
    ];
    buildInputs = [nodejs];
    phases = "unpackPhase buildPhase checkPhase";
    buildPhase = ''
      mkdir "$out"

      export NODE_PATH=./node_modules
      ./node_modules/.bin/tsc -p tsconfig.prod.json --outDir "$out"
      cp package.json yarn.lock "$out"
    '';
    checkPhase = ''
      dist=$(mktemp -d)
      export PATH="$PATH:${pandoc}/bin"
      export NODE_PATH="$(pwd)/node_modules"
      ./node_modules/.bin/tsc -p tsconfig.json --outDir "$dist"
      ./node_modules/.bin/jest \
        -c jest.ci.json \
        --runInBand \
        --ci \
        --verbose \
        --rootDir "$dist"
    '';
  };

in
  dist
