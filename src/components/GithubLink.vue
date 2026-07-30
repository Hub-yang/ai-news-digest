<script setup lang="ts">
import IconGithub from '~icons/lucide/github'
</script>

<template>
  <a
    class="github-link"
    href="https://github.com/Hub-yang"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="访问 GitHub 主页"
    title="GitHub"
  >
    <IconGithub />
  </a>
</template>

<style scoped>
.github-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--fg);
  text-decoration: none;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.github-link:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.github-link svg {
  width: 1.1rem;
  height: 1.1rem;
}
</style>
