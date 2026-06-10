-- ============================================================
-- Acceso como invitado (auth anónima de Supabase)
-- ============================================================
-- Un invitado entra con su nombre vía signInAnonymously(): obtiene un
-- auth.uid real (is_anonymous=true), participa con RLS normal, y queda
-- marcado como "no registrado". Co-organizador sigue requiriendo cuenta
-- registrada (se agrega por email, que un anónimo no tiene).

alter table public.profiles
  add column if not exists is_anonymous boolean not null default false;

-- El trigger de creación de perfil debe tolerar usuarios sin email
-- (anónimos) y propagar el flag is_anonymous.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, is_anonymous)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Invitado'
    ),
    coalesce(new.is_anonymous, false)
  );
  return new;
end;
$$;
