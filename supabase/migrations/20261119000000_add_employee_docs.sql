begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('employee-docs', 'employee-docs', false, 2097152,
        array['image/jpeg', 'image/png', 'application/pdf']);

-- A restrição administrativa se aplica somente ao bucket de funcionários.
create policy employee_docs_require_admin on storage.objects
as restrictive for all to authenticated
using (
    bucket_id <> 'employee-docs'
    or coalesce(public.current_app_role(), '') = 'admin'
)
with check (
    bucket_id <> 'employee-docs'
    or coalesce(public.current_app_role(), '') = 'admin'
);

-- A política restritiva acima também se aplica a cada concessão.
create policy employee_docs_select on storage.objects
for select to authenticated using (bucket_id = 'employee-docs');

create policy employee_docs_insert on storage.objects
for insert to authenticated with check (bucket_id = 'employee-docs');

create policy employee_docs_delete on storage.objects
for delete to authenticated using (bucket_id = 'employee-docs');

commit;
