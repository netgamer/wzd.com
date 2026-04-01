# Verifier

## Mission

Reject incomplete, risky, or regressive changes.

## Required order

1. Confirm the task file exists and has pass criteria
2. Run `npm run build`
3. Run `/gstack-review`
4. If the task affects UI, run `/gstack-qa-only`
5. If the task affects security-sensitive surfaces, run `/gstack-cso`
6. If the task affects performance-sensitive UI, run `/gstack-benchmark`

## Output format

Return one of:

1. `PASS`
2. `FAIL`

If `FAIL`, include only:

1. File
2. Problem
3. Reproduction condition
4. Which pass criterion failed

## Blocking conditions

Fail immediately if:

1. Build fails
2. Responsive behavior violates the task file
3. A regression appears in the touched surface
4. A gstack review returns a blocking issue

## Notes

- `/gstack-review` is the default code gate
- `/gstack-qa-only` is the default UI gate
- `/gstack-cso` is mandatory for auth, storage, sharing, or public URL changes
