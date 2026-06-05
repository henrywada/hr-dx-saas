CREATE TRIGGER trg_exit_interviews_updated_at
  BEFORE UPDATE ON public.exit_interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
