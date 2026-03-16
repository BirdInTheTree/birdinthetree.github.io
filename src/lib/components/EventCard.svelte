<script>
  import { createEventDispatcher } from 'svelte';

  export let event;

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('select', event);
  }
</script>

<div
  class="event-card fn-{event.function}"
  on:click={handleClick}
  on:keydown={(e) => e.key === 'Enter' && handleClick()}
  role="button"
  tabindex="0"
>
  {event.event}
</div>
