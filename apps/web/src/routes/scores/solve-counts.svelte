<script lang="ts">
  import { IconTrophy } from '$lib/icons'
  import { useChallenges } from '$lib/query/challenges'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Spinner from '$lib/ui/spinner.svelte'

  const challengesQuery = useChallenges()

  // Standings are hidden, but per-challenge solve counts are safe to show: they
  // carry no identities or ordering. Most-solved first, then by name.
  const rows = $derived(
    [...(challengesQuery.data ?? [])].sort(
      (a, b) => b.solves - a.solves || a.name.localeCompare(b.name)
    )
  )

  const totalSolves = $derived(rows.reduce((sum, c) => sum + c.solves, 0))
</script>

<solve-counts>
  {#if challengesQuery.isLoading}
    <solve-counts-center><Spinner /></solve-counts-center>
  {:else if rows.length === 0}
    <solve-counts-center>
      <EmptyState
        icon={IconTrophy}
        title="No challenges yet"
        subtitle="Solve counts appear here once challenges are released."
      />
    </solve-counts-center>
  {:else}
    <solve-counts-frame>
      <solve-counts-header>
        <h1>Solve counts</h1>
        <p>
          Full standings are revealed when the competition ends. Until then,
          here is how many players have solved each challenge.
        </p>
      </solve-counts-header>

      <table>
        <thead>
          <tr>
            <th scope="col" data-col="category">Category</th>
            <th scope="col" data-col="name">Challenge</th>
            <th scope="col" data-col="solves">Solves</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as challenge (challenge.id)}
            <tr>
              <td data-col="category">{challenge.category}</td>
              <td data-col="name">{challenge.name}</td>
              <td data-col="solves">{challenge.solves.toLocaleString()}</td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <td data-col="category"></td>
            <td data-col="name">Total</td>
            <td data-col="solves">{totalSolves.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </solve-counts-frame>
  {/if}
</solve-counts>

<style>
  solve-counts {
    display: flex;
    flex: 1;
    justify-content: center;
    min-block-size: 0;
    overflow: auto;
    padding: var(--space-s) var(--space-s) 1rem;
  }

  solve-counts-center {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
  }

  solve-counts-frame {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    inline-size: 100%;
    max-inline-size: 46rem;
  }

  solve-counts-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  solve-counts-header h1 {
    margin: 0;
    font-size: var(--step-1);
  }

  solve-counts-header p {
    margin: 0;
    font-size: var(--step--1);
    color: var(--foreground-l3);
  }

  table {
    inline-size: 100%;
    border-collapse: collapse;
    background: var(--background-l1);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  th,
  td {
    padding: var(--space-2xs) var(--space-s);
    text-align: start;
  }

  thead th {
    font-size: var(--step--1);
    font-weight: var(--font-weight-normal);
    color: var(--foreground-l3);
    border-block-end: 1px solid var(--border);
  }

  tbody tr:not(:last-child) td {
    border-block-end: 1px solid var(--border);
  }

  td[data-col='category'] {
    color: var(--foreground-l3);
    text-transform: capitalize;
  }

  td[data-col='name'] {
    color: var(--foreground-l0);
  }

  [data-col='solves'] {
    text-align: end;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  tfoot td {
    border-block-start: 1px solid var(--border);
    color: var(--foreground-l2);
    font-size: var(--step--1);
  }
</style>
