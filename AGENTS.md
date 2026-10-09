<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
 
- Borrow and return actions share the registry modal shell and use separate forms; this keeps transaction fields and validation consistent across entry points.
- Store compressed equipment photos with their local registry records; this preserves images while registry persistence remains browser-local.
- Keep registry management under the authenticated route layout; this prevents signed-out visitors from reaching editing workflows.
