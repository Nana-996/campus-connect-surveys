-- Attach handle_new_user trigger to auto-create profile + signup credits on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profile for any existing auth user without one
INSERT INTO public.profiles (id, full_name, university_name, university_domain, department, year, earned_credits, paid_credits, email_hash, user_type)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name',''),
  COALESCE(u.raw_user_meta_data->>'university_name',
    CASE WHEN lower(COALESCE(u.raw_user_meta_data->>'user_type','student')) = 'student'
      THEN initcap(split_part(lower(split_part(u.email,'@',2)),'.',1)) || ' University'
      ELSE 'General' END),
  lower(split_part(u.email,'@',2)),
  COALESCE(u.raw_user_meta_data->>'department',''),
  COALESCE(u.raw_user_meta_data->>'year',''),
  3, 0,
  encode(digest(lower(trim(u.email)), 'sha256'), 'hex'),
  CASE WHEN lower(COALESCE(u.raw_user_meta_data->>'user_type','student')) IN ('student','general')
       THEN lower(u.raw_user_meta_data->>'user_type') ELSE 'student' END
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;