# Contact Form

The form that [Quick Start](/guide/quick-start) builds, running in the page.

<script setup>
import ContactForm from './demos/contact-form.vue'
</script>

<DemoFrame title="The Quick Start form">
  <ContactForm />
</DemoFrame>

Leave an input with a wrong value to see its error, or press Send to check the whole form.

::: code-group

<<< ./demos/contact-form.vue [demos/contact-form.vue]

<<< ./forms/contact-form.ts [forms/contact-form.ts]

<<< ./forms/api.ts [forms/api.ts]

:::
