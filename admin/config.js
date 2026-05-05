// Decap CMS config as JS to avoid `config.yml` caching/fetch issues.
// This mirrors `admin/config.yml` and is used via manual init in `admin/index.html`.
window.DECAP_CMS_CONFIG = {
  backend: {
    name: "github",
    repo: "konradsimon/konradsimon.github.io",
    branch: "main",
    base_url: "https://crimson-queen-742f.radius-simon.workers.dev",
    auth_endpoint: "auth",
  },
  publish_mode: "simple",
  media_folder: "assets/uploads",
  public_folder: "/assets/uploads",
  collections: [
    {
      name: "projects",
      label: "Projects",
      files: [
        {
          name: "projectsFile",
          label: "All projects",
          file: "content/projects.json",
          fields: [
            {
              name: "projects",
              label: "Projects",
              widget: "list",
              summary: "{{fields.title}} ({{fields.category}})",
              fields: [
                { name: "published", label: "Published", widget: "boolean", default: true, required: false },
                { name: "slug", label: "Slug", widget: "string", hint: "Used in URL: project.html?slug=...", required: true },
                {
                  name: "category",
                  label: "Category",
                  widget: "select",
                  required: true,
                  options: [
                    { label: "Visuals and Light", value: "visuals-and-light" },
                    { label: "Interactive and Installations", value: "interactive-and-installations" },
                    { label: "Tools and Experiments", value: "tools-and-experiments" },
                    { label: "Music", value: "music" },
                  ],
                },
                { name: "title", label: "Title", widget: "string", required: true },
                { name: "subtitle", label: "Subtitle", widget: "string", required: false },
                { name: "role", label: "My function / role", widget: "string", required: false },
                { name: "credits", label: "Credits", widget: "text", required: false, hint: "One credit per line (line breaks supported)" },
                { name: "description", label: "Description", widget: "text", required: false },
                {
                  name: "photos",
                  label: "Photos",
                  widget: "list",
                  required: false,
                  summary: "{{fields.credit}}",
                  fields: [
                    { name: "image", label: "Image", widget: "image", required: true },
                    { name: "credit", label: "Photo credit", widget: "string", required: false },
                  ],
                },
                { name: "videoUrl", label: "Video link", widget: "string", required: false },
              ],
            },
          ],
        },
      ],
    },
  ],
};

