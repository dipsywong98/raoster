# Roaster

Roasting stuff using GitHub action

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.0.26. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Toast

Toast is a tool to clone a website recursively using github workflow, it can periodically refresh, so you dont need to keep a process running on your computer nor set up a VCS

1. Create a new repo to store the cloned website
1. Generate a ssh key pair `ssh-keygen -t ed25519 -C <your-email>`
1. Put the public key to the new repo deploy key
1. Put the private key to roaster repo action secret
1. Create a new workflow at `/.github/workflow`, see toast-classquota.yml as example
