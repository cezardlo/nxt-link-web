-- Let the trusted backend (service_role) advance vendor_applications moderation
-- columns, in addition to platform admins. Regular authenticated users are
-- still reverted, so this adds no new exposure. Applied live 2026-07-16.
CREATE OR REPLACE FUNCTION public.guard_vendor_application_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    new.status      := old.status;
    new.admin_notes := old.admin_notes;
    new.approved_at := old.approved_at;
    new.auth_id     := old.auth_id;
  end if;
  return new;
end;
$function$;
