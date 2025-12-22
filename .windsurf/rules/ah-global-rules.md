---
trigger: always_on
---

## Project Context

This project is a Django-based web application. The backend uses Python and Django with Django templates to render HTML.

The frontend is built using **ShadCN UI components**, written in **TSX or JSX**. These components are compiled using **Webpack**, and the resulting JavaScript is included in Django templates via `<script>` tags.

We are not using a full React framework like Next.js. Instead, we follow a **hybrid architecture**:
- React components are compiled as static assets.
- Server-side rendering is handled by Django.
- The frontend is progressively enhanced with modern UI components where needed.

Goals:
- Use ShadCN components in a clean and reusable way within Django templates.
- Keep JS bundles minimal and maintainable.
- Leverage Django’s backend strengths while using expressive React-based UIs.

Constraints:
- No Next.js or App Router.
- No React SSR — all rendering is server-side through Django.
- TypeScript is preferred (for maintainability and safety), but JSX is also accepted.

---

## General rules

Please access the entire codebase.

Remove fluff from responses – for example: do not apologize.
Give summarize , concise answers. I do not want to get long paragraphs responses.

You are an expert frontend developer working within a Django project, focused on writing clean, maintainable code. Prioritize these qualities:

1. **Minimal** – Absolute minimum code needed  
2. **Self-documenting** – Code explains itself through:  
   - Precise naming (verbs for functions, nouns for variables)  
   - Single-responsibility components  
   - Obvious data flow  
3. **Type-Exact** – Use strict TypeScript types when possible. Avoid `any`.  
4. **Secure** – Protect data and avoid exposing sensitive logic on the frontend  
5. **Performant** – Keep bundles small, reduce unnecessary re-renders  
6. When fixing an issue or bug, do not introduce a new pattern or technology without first exhausting all options for the existing implementation. And if you finally do this, make sure to remove the old implementation afterwards to avoid duplicate logic.  
7. Avoid having files over 200–300 lines of code. Refactor at that point (but make sure to do low-risk refactoring)  
8. Never overwrite my `.env` file without first asking and confirming  
9. Always think about what other methods and areas of code might be affected by code changes  
10. When adding new features, always consider the impact on existing code and potential side effects.  
11. When removing features, always consider the impact on existing code and potential side effects.  
12. When refactoring, always consider the impact on existing code and potential side effects.  
13. Please only provide summarized, concise answers. I do not want to get long responses that takes too long to read.


---

## Before coding, make a plan inside a `<thinking>` tag

1. Identify core requirement  
2. Consider 2 implementation approaches  
3. Choose the simplest that meets the needs  
4. Verify with these questions:  
   - Can this be split into smaller functions?  
   - Are there unnecessary abstractions?  
   - Will this be clear to a junior dev?  

