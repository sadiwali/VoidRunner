using System.Collections.Generic;
using UnityEngine;

public static class achievements
{
	public static List<string> achs;

	private static int howMany;

	public static List<string> totalAchs;

	static achievements()
	{
		achs = new List<string>();
		howMany = 0;
		totalAchs = new List<string>();
		totalAchs.Add("stronglegs");
		totalAchs.Add("dedicated");
		totalAchs.Add("bandageman");
		totalAchs.Add("friends");
		totalAchs.Add("champ");
		totalAchs.Add("quick");
		totalAchs.Add("finisher");
	}

	public static void EvalStronglegs(int n)
	{
		if (n > 50 && !CheckAch(totalAchs[0]))
		{
			achs.Add(totalAchs[0]);
			PlayerMemories.SetList("achievements", achs);
			GameObject.FindWithTag("aSayer").GetComponent<Sayer>().Say("( " + totalAchs[0] + " )", 5);
			read();
		}
	}

	public static void EvalDedicated(int n)
	{
		if (n == 3)
		{
			achs.Add(totalAchs[1]);
			PlayerMemories.SetList("achievements", achs);
			GameObject.FindWithTag("aSayer").GetComponent<Sayer>().Say("( " + totalAchs[1] + " )", 5);
			read();
		}
	}

	public static void EvalBandageman(int n)
	{
		if (n > 1 && !CheckAch(totalAchs[2]))
		{
			achs.Add(totalAchs[2]);
			PlayerMemories.SetList("achievements", achs);
			GameObject.FindWithTag("aSayer").GetComponent<Sayer>().Say("( " + totalAchs[2] + " )", 5);
			read();
		}
	}

	public static void EvalFriends()
	{
		if (!CheckAch(totalAchs[3]))
		{
			achs.Add(totalAchs[3]);
			PlayerMemories.SetList("achievements", achs);
			read();
		}
	}

	public static void EvalChamp(string who)
	{
		if (who == PlayerMemories.GetString("name") && !CheckAch(totalAchs[4]))
		{
			achs.Add(totalAchs[4]);
			PlayerMemories.SetList("achievements", achs);
			GameObject.FindWithTag("aSayer").GetComponent<Sayer>().Say("( " + totalAchs[4] + " )", 5);
			read();
		}
	}

	public static void EvalQuick(int n)
	{
		if (n < 60 && !CheckAch(totalAchs[5]))
		{
			achs.Add(totalAchs[5]);
			PlayerMemories.SetList("achievements", achs);
			GameObject.FindWithTag("aSayer").GetComponent<Sayer>().Say("( " + totalAchs[5] + " )", 5);
			read();
		}
	}

	public static void EvalFinisher()
	{
		if (!CheckAch(totalAchs[6]))
		{
			achs.Add(totalAchs[6]);
			PlayerMemories.SetList("achievements", achs);
			GameObject.FindWithTag("aSayer").GetComponent<Sayer>().Say("( " + totalAchs[6] + " )", 5);
			read();
		}
	}

	public static bool CheckAch(string what)
	{
		read();
		if (achs.Contains(what.ToLower()))
		{
			return true;
		}
		return false;
	}

	public static int HowMany()
	{
		read();
		return achs.Count;
	}

	public static void read()
	{
		achs = PlayerMemories.GetList("achievements");
		for (int i = 0; i < achs.Count; i++)
		{
			if (string.IsNullOrEmpty(achs[i]))
			{
				achs.RemoveAt(i);
			}
		}
		for (int j = 0; j < achs.Count; j++)
		{
			Debug.Log(achs[j]);
		}
	}
}
