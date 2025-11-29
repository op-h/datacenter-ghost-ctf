{ pkgs }: {
  deps = [
    pkgs.nginx
    pkgs.sqlite
    pkgs.bashInteractive
    pkgs.curl
    pkgs.unzip
  ];
}
