# Contact Form

A contact form that validates each input as the user leaves it, and the whole form on submit.

<script setup>
import ContactForm from './demos/contact-form.vue'
</script>

<DemoFrame title="A contact form">
  <ContactForm />
</DemoFrame>

Leave an input with a wrong value to see its error, or press Send to validate the whole form.

::: code-group

<<< ./demos/contact-form.vue [demos/contact-form.vue]

<<< ./forms/contact-form.ts [forms/contact-form.ts]

<<< ./forms/api.ts [forms/api.ts]

:::
