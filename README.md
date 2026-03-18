# PulsePlan Fitness Tracker

PulsePlan is a browser-based workout and nutrition tracker built from your weekly PDF template.

## Multi-user login (username only)

- Open the app and enter a username.
- No password is required.
- Each username has separate local browser data.
- Use **Switch user** in the app header to change users.

## Run locally (no Docker)

If you want to run with Python:

```powershell
c:/Vibe-Code/fitness-tracker/.venv/Scripts/python.exe -m http.server 8080
```

Then open: `http://localhost:8080`

## Docker

Build and run:

```powershell
docker compose up -d --build
```

Stop:

```powershell
docker compose down
```

App URL: `http://localhost:8080`

## GitHub Actions Docker CI

This repository includes a workflow at `.github/workflows/docker-publish.yml`.

What it does:

- On every push to `main`, it builds and publishes an image to `ghcr.io/newgithubguy/fitness-tracker`.
- On Git tag pushes like `v1.0.0`, it also publishes tagged images.
- It also publishes a `latest` tag from the default branch.

One-time setup in GitHub:

1. Open the repository Settings > Actions > General.
2. Ensure workflows are allowed.
3. Open Settings > Packages and ensure your package visibility is set as desired.
4. For Portainer pull access without auth, set the package visibility to Public.

## Portainer deployment

### Recommended (prebuilt image)

1. In Portainer, go to Stacks > Add stack.
2. Name it pulseplan.
3. Paste the contents of `docker-compose.portainer.yml`.
4. Deploy the stack.

This pulls `ghcr.io/newgithubguy/fitness-tracker:latest`.

### Option 1: Upload project files

1. In Portainer, go to **Stacks** > **Add stack**.
2. Name it `pulseplan`.
3. Paste the contents of `docker-compose.yml`.
4. Deploy the stack.

### Option 2: Git repository stack

1. Push this folder to a Git repository.
2. In Portainer, create a stack from repository.
3. Point to the repository and `docker-compose.yml`.
4. Deploy.

## Notes

- Data is stored in browser localStorage per username.
- If users log in from different devices/browsers, data does not sync automatically.
