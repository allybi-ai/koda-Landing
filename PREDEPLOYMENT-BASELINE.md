# First reviewed main baseline

The source landing layout, unfinished forms and offers remain unchanged. The Docker build now runs the reviewed allowlisted publication transform, producing the same canonical-domain routing and hardened server previously tested in the isolated Desktop package.

Public entry links: `/login` selects sign-in, `/signup` selects account creation, `/app` selects the authenticated app entry. The app/API must enforce sessions and resource permissions. A returning visitor marker is a routing preference, never authentication. `/explore` always remains available. Shared language preference is independent of login lifetime.

Build: `docker build --build-arg SOURCE_REVISION=<commit> -t allybi-landing:reviewed .`

The final image contains only the allowlisted publication, runs as an unprivileged user, and does not publish repository/configuration files. It is intended to sit behind the webapp repository's same-origin gateway. No DNS, HTTPS, cloud deployment or backend security certification is implied by this source baseline.

Main is the reviewed integration branch. Further work belongs on feature branches until reviewed and tested. Local instructions do not enforce GitHub branch protection; no repository settings were changed.
