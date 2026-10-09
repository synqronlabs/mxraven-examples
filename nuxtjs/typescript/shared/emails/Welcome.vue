<script setup lang="ts">
defineProps<{ name: string }>();
</script>

<template>
  <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6">
    <h1 style="font-size: 24px">Welcome, {{ name }}!</h1>
    <p>This message was rendered from a Vue component and sent with <code>@mxraven/mail</code>.</p>
    <p style="color: #666666">The Acme team</p>
  </div>
</template>
