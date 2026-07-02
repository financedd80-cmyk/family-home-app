import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Role } from "@/types/familyApp";

export type FamilyMemberRecord = {
  id: string;
  displayName: string;
  role: Role;
};

export type CurrentFamilyMember = FamilyMemberRecord & { familyId: string };

export type SupaFamily = {
  id: string;
  name: string;
};

// Single source of truth for "who is logged in and which family do they
// belong to" — read once here and passed down as props, instead of every
// component that needs it opening its own auth subscription.
export function useFamilySession() {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(() => !isSupabaseConfigured);

  const [currentMember, setCurrentMember] = useState<CurrentFamilyMember | null>(
    null
  );
  const [family, setFamily] = useState<SupaFamily | null>(null);
  const [members, setMembers] = useState<FamilyMemberRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Once logged in, read-only: this member's family_members row, their
  // family, and the rest of the family's members. No writes happen here.
  useEffect(() => {
    if (!supabase || !session?.user) return;

    let cancelled = false;

    async function loadFamilyData() {
      if (!supabase || !session?.user) return;
      setLoading(true);
      setError(null);

      const { data: memberRow, error: memberError } = await supabase
        .from("family_members")
        .select("id, family_id, display_name, role")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (memberError) {
        setError(`שגיאה בטעינת בן המשפחה: ${memberError.message}`);
        setLoading(false);
        return;
      }

      if (!memberRow) {
        setError(
          "לא נמצאה רשומת בן משפחה המקושרת למשתמש המחובר הזה ב-Supabase."
        );
        setLoading(false);
        return;
      }

      const [
        { data: familyRow, error: familyError },
        { data: memberRows, error: membersError },
      ] = await Promise.all([
        supabase
          .from("families")
          .select("id, name")
          .eq("id", memberRow.family_id)
          .maybeSingle(),
        supabase
          .from("family_members")
          .select("id, display_name, role")
          .eq("family_id", memberRow.family_id),
      ]);

      if (cancelled) return;

      if (familyError || membersError) {
        setError(
          `שגיאה בטעינת נתוני המשפחה: ${
            familyError?.message ?? membersError?.message
          }`
        );
        setLoading(false);
        return;
      }

      setCurrentMember({
        id: memberRow.id,
        familyId: memberRow.family_id,
        displayName: memberRow.display_name,
        role: memberRow.role,
      });
      setFamily(familyRow ?? null);
      setMembers(
        (memberRows ?? []).map((m) => ({
          id: m.id,
          displayName: m.display_name,
          role: m.role,
        }))
      );
      setLoading(false);
    }

    loadFamilyData();

    return () => {
      cancelled = true;
    };
  }, [session]);

  return { session, authChecked, currentMember, family, members, loading, error };
}
