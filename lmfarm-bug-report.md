# LMfarm Bug Report — shortrout: external egress refused + exec cannot see running pod

**Date observed:** 2026-06-30
**Reporter org:** whytoe
**CLI version:** lmfarm-cli 0.59.31

## Affected service

| Field | Value |
|---|---|
| Name | shortrout |
| Service ID | 7809430a-f345-4eea-8b56-1eb378aea87d |
| Namespace | tenant-12f93db3ec2c |
| Pod | shortrout-d776f6d48-7jdzg (node gbq50b) |
| Image | which-is-shorter:build-20260518113221 |
| Status | Running, 1/1 |
| Pod restarts | 139 (cumulative), last_terminated: Error (exit 1) |
| Service last updated | **2026-06-30T11:26:00Z** |

## Summary

After the service was reconfigured at **11:26 UTC on 2026-06-30**, two faults appeared together:

1. **Outbound egress to the public internet is refused** — the app can reach its database (internal cluster traffic) but every outbound HTTPS request to an external host fails with `ECONNREFUSED`.
2. **`lmfarm exec` cannot find the pod** — every exec form returns `No running pods found for service`, even though `services debug` reports the same pod as `Running 1/1` at the same moment.

Both symptoms are consistent with a **label-selector / NetworkPolicy mismatch** between the running pod and the service's post-update configuration: the pod is no longer matched by the selector used for exec targeting and for the egress NetworkPolicy, so exec can't target it and its external egress is no longer permitted (default-deny baseline), while the already-established internal DB route keeps working.

## Symptom 1 — external egress refused (ECONNREFUSED)

The application makes server-side `fetch()` calls to `https://maps.googleapis.com/...`. Every call fails. Service logs (`lmfarm logs --org whytoe shortrout`):

```
⨯ TypeError: fetch failed
  [cause]: AggregateError:
    code: 'ECONNREFUSED'
    [errors]: [ [Error], [Error], [Error], [Error], ... ]   # all resolved IPs (v4 + v6) refused
    at async Module.P [as handler] (.next/server/chunks/...)
```

Contrast with internal egress, which works:

```
$ curl -s https://shortrout.45.59.71.47.nip.io/api/health
{"status":"ok"}      # this endpoint performs a live PostgreSQL query, so DB egress is fine
```

The Google Maps API key is valid and bound to the service (verified independently against Google's API), and `ECONNREFUSED` is an *active refusal* rather than a timeout — so this is not an API-key, DNS-blackhole, or packet-drop issue but a connection being rejected at the egress path.

## Symptom 2 — exec cannot see a running pod

At the same time `services debug` reports the pod running:

```
$ lmfarm services debug --org whytoe shortrout
Pods (1):
  shortrout-d776f6d48-7jdzg  Running  containers: 1/1  on gbq50b   restarts=139
```

…every `exec` form fails to find it:

```
$ lmfarm exec --org whytoe shortrout -- echo hello
Error: No running pods found for service

$ lmfarm exec --org whytoe 7809430a-f345-4eea-8b56-1eb378aea87d -- echo hello
Error: No running pods found for service

$ lmfarm exec --org whytoe shortrout -it -- echo hello
Error: No running pods found for service
```

There is no `port-forward` command available as a fallback, so the pod is currently un-shell-able through the CLI. This blocks operators from diagnosing the egress problem from inside the container.

## Impact

- End users cannot use address search / distance calculation — the core feature of the app — because all Google Maps calls fail.
- Operators cannot exec into the pod to diagnose, because exec can't resolve the (running) pod.

## Expected behavior

1. A `Running` pod reported by `services debug` should be targetable by `exec`.
2. A service that could reach external APIs before a config update should retain external egress after a no-network-change config update (the 11:26 update changed env/config, not networking).

## Suspected cause

Control-plane selector / NetworkPolicy reconciliation after the 11:26 config update left the running pod unmatched by (a) the exec pod selector and (b) the egress NetworkPolicy. This matches prior history on this org where config changes/redeploys have disturbed this service's NetworkPolicy and where the control plane has reported a pod it could not reconcile.

## Suggested operator workaround (pending fix)

`lmfarm services redeploy --org whytoe shortrout` to force a fresh rollout and recreate the NetworkPolicy/selector. (Not yet performed — recording here as the likely remediation; should also confirm the diagnosis if egress and exec recover afterward.)

## What to investigate on the platform side

- Whether the running pod's labels match the service's current selector and the egress NetworkPolicy podSelector.
- Whether the egress NetworkPolicy has an `egress` rule permitting traffic to external (non-cluster) CIDRs / ports 443.
- Why `exec` pod resolution and `services debug` pod resolution disagree (different selectors or a stale control-plane cache).
