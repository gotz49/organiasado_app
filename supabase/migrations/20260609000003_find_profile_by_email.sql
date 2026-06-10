-- Búsqueda de usuario por email para invitación nominal e import de Excel.
-- SECURITY DEFINER porque los emails viven en auth.users (no expuestos por RLS).
-- Devuelve solo el id: no filtra datos del perfil.

create or replace function public.find_profile_by_email(p_email text)
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

grant execute on function public.find_profile_by_email(text) to authenticated;
