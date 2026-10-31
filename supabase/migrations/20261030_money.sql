-- Manual money tracking. Amounts are exact minor units (paise/cents).
BEGIN;
CREATE TABLE IF NOT EXISTS public.money_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  kind TEXT NOT NULL CHECK (kind IN ('cash','bank','wallet')),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR','USD','EUR','GBP')),
  opening_minor BIGINT NOT NULL DEFAULT 0 CHECK (abs(opening_minor::numeric) <= 1000000000000),
  opening_date DATE NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id,user_id)
);
CREATE TABLE IF NOT EXISTS public.money_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  to_account_id UUID,
  kind TEXT NOT NULL CHECK (kind IN ('income','expense','transfer')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 1000000000000),
  date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (account_id,user_id) REFERENCES public.money_accounts(id,user_id),
  FOREIGN KEY (to_account_id,user_id) REFERENCES public.money_accounts(id,user_id),
  CHECK ((kind = 'transfer' AND to_account_id IS NOT NULL AND to_account_id <> account_id AND category = '') OR
    (kind = 'income' AND to_account_id IS NULL AND category IN ('Salary','Freelance','Business','Gift','Refund','Other income')) OR
    (kind = 'expense' AND to_account_id IS NULL AND category IN ('Food & groceries','Transport','Housing','Bills & utilities','Shopping','Health','Education','Entertainment','Family','Other')))
);
CREATE TABLE IF NOT EXISTS public.money_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL CHECK (extract(day FROM month) = 1),
  currency TEXT NOT NULL CHECK (currency IN ('INR','USD','EUR','GBP')),
  category TEXT NOT NULL CHECK (category IN ('Food & groceries','Transport','Housing','Bills & utilities','Shopping','Health','Education','Entertainment','Family','Other')),
  limit_minor BIGINT NOT NULL CHECK (limit_minor > 0 AND limit_minor <= 1000000000000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id,month,currency,category)
);
-- Serialise account edits with transfer inserts; a transfer is one atomic row.
CREATE OR REPLACE FUNCTION public.validate_money_transaction() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE source public.money_accounts; destination public.money_accounts;
BEGIN
  PERFORM id FROM public.money_accounts WHERE user_id = NEW.user_id AND id IN (NEW.account_id, NEW.to_account_id) ORDER BY id FOR UPDATE;
  SELECT * INTO source FROM public.money_accounts WHERE id = NEW.account_id AND user_id = NEW.user_id;
  IF source.id IS NULL THEN RAISE EXCEPTION 'Choose an account in your workspace.'; END IF;
  IF NEW.date < source.opening_date THEN RAISE EXCEPTION 'Transaction predates the account opening date.'; END IF;
  IF source.archived AND (TG_OP = 'INSERT' OR OLD.account_id IS DISTINCT FROM NEW.account_id) THEN RAISE EXCEPTION 'Restore this account first.'; END IF;
  IF NEW.kind = 'transfer' THEN
    SELECT * INTO destination FROM public.money_accounts WHERE id = NEW.to_account_id AND user_id = NEW.user_id;
    IF destination.id IS NULL OR destination.currency <> source.currency THEN RAISE EXCEPTION 'Transfer accounts must belong to you and use the same currency.'; END IF;
    IF NEW.date < destination.opening_date THEN RAISE EXCEPTION 'Transfer predates the destination account opening date.'; END IF;
    IF destination.archived AND (TG_OP = 'INSERT' OR OLD.to_account_id IS DISTINCT FROM NEW.to_account_id) THEN RAISE EXCEPTION 'Restore the destination first.'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS money_transaction_valid ON public.money_transactions;
CREATE TRIGGER money_transaction_valid BEFORE INSERT OR UPDATE ON public.money_transactions FOR EACH ROW EXECUTE FUNCTION public.validate_money_transaction();
CREATE OR REPLACE FUNCTION public.protect_money_opening() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.currency,NEW.opening_date,NEW.opening_minor) IS DISTINCT FROM (OLD.currency,OLD.opening_date,OLD.opening_minor)
    AND EXISTS (SELECT 1 FROM public.money_transactions WHERE user_id = OLD.user_id AND (account_id = OLD.id OR to_account_id = OLD.id)) THEN
    RAISE EXCEPTION 'Opening balance, date and currency are locked once transactions exist.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS money_opening_protected ON public.money_accounts;
CREATE TRIGGER money_opening_protected BEFORE UPDATE ON public.money_accounts FOR EACH ROW EXECUTE FUNCTION public.protect_money_opening();
ALTER TABLE public.money_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.money_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.money_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_read ON public.money_accounts;
CREATE POLICY own_read ON public.money_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS own_insert ON public.money_accounts;
CREATE POLICY own_insert ON public.money_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS own_update ON public.money_accounts;
CREATE POLICY own_update ON public.money_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS own_records ON public.money_transactions;
CREATE POLICY own_records ON public.money_transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS own_records ON public.money_budgets;
CREATE POLICY own_records ON public.money_budgets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT,INSERT,UPDATE ON public.money_accounts TO authenticated;
REVOKE DELETE ON public.money_accounts FROM authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.money_transactions,public.money_budgets TO authenticated;
CREATE INDEX IF NOT EXISTS money_accounts_user_idx ON public.money_accounts(user_id);
CREATE INDEX IF NOT EXISTS money_transactions_date_idx ON public.money_transactions(user_id,date);
CREATE INDEX IF NOT EXISTS money_transactions_account_idx ON public.money_transactions(user_id,account_id);
CREATE INDEX IF NOT EXISTS money_transactions_destination_idx ON public.money_transactions(user_id,to_account_id);
NOTIFY pgrst, 'reload schema';
COMMIT;
