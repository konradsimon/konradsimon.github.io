// Decap CMS config as JS to avoid `config.yml` fetch issues.
// Edit the placeholders below.
window.DECAP_CMS_CONFIG = {
  backend: {
    name: "github",
    repo: "konradsimon/konradsimon.github.io",
    branch: "main",
    base_url: "https://crimson-queen-742f.radius-simon.workers.dev",
    auth_endpoint: "auth",
  },
  publish_mode: "editorial_workflow",
  media_folder: "assets/uploads",
  public_folder: "/assets/uploads",
  collections: [
    {
      name: "projects",
      label: "Projects",
      label_singular: "Project",
      folder: "content/projects",
      create: true,
      extension: "json",
      format: "json",
      slug: "{{slug}}",
      fields: [
        {
          name: "slug",
          label: "Slug",
          widget: "string",
          hint: "Used in URL: project.html?slug=...",
          required: true,
        },
        { name: "title", label: "Title", widget: "string", required: true },
        { name: "subtitle", label: "Subtitle", widget: "string", required: false },
        { name: "role", label: "My function / role", widget: "string", required: false },
        { name: "participants", label: "Participants", widget: "list", required: false, hint: "Names / credits" },
        { name: "description", label: "Description", widget: "text", required: false },
        {
          name: "photos",
          label: "Photos",
          widget: "list",
          required: false,
          field: { name: "image", label: "Image", widget: "image" },
        },
        { name: "videoUrl", label: "Video link", widget: "string", required: false },
      ],
    },
  ],
};

