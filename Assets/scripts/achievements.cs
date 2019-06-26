using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public static class achievements 
{


    public static List<string> achs = new List<string>();
    private static int howMany = 0;
    public static List<string> totalAchs = new List<string>();
    
    
	// Use this for initialization

	static achievements()
    {
        totalAchs.Add("stronglegs");
        totalAchs.Add("dedicated");
        totalAchs.Add("bandageman");
        totalAchs.Add("friends");
        totalAchs.Add("champ");
        totalAchs.Add("quick");
        totalAchs.Add("finisher");
    }

	//works
    public static void EvalStronglegs(int n)
    {
        if (n > 50 && (CheckAch(totalAchs[0]) ==false))
        {
            achs.Add(totalAchs[0]);
            PlayerMemories.SetList("achievements", achs);
			GameObject.FindWithTag("aSayer").GetComponent<Sayer>().Say("( "+totalAchs[0]+" )",5);
            read();
        }
        
    }

	//works
    public static void EvalDedicated(int n)
    {
		if (n == 3)
        {
            achs.Add(totalAchs[1]);
            PlayerMemories.SetList("achievements", achs);
			GameObject.FindWithTag("aSayer").GetComponent<Sayer>().Say("( "+totalAchs[1]+" )",5);

            read();
        }
    }

	//works
    public static void EvalBandageman(int n)
    {
		if (n > 1 && (CheckAch(totalAchs[2]) ==false))
        {
            achs.Add(totalAchs[2]);
            PlayerMemories.SetList("achievements", achs);
			GameObject.FindWithTag("aSayer").GetComponent<Sayer>().Say("( "+totalAchs[2]+" )",5);
            read();
        }
    }

    public static void EvalFriends()
    {
		if (CheckAch (totalAchs [3]) == false) 
		{
			achs.Add (totalAchs [3]);
			PlayerMemories.SetList ("achievements", achs);
            read();
		}
    }

    public static void EvalChamp(string who)
    {
		if (who == PlayerMemories.GetString("name") && (CheckAch(totalAchs[4]) ==false))
        {
            achs.Add(totalAchs[4]);
            PlayerMemories.SetList("achievements", achs);
			GameObject.FindWithTag("aSayer").GetComponent<Sayer>().Say("( "+totalAchs[4]+" )",5);
            read();
        }
    }

    public static void EvalQuick(int n)
    {

		if (n < 60 && (CheckAch(totalAchs[5]) ==false))
        {
            achs.Add(totalAchs[5]);
            PlayerMemories.SetList("achievements", achs);
			GameObject.FindWithTag("aSayer").GetComponent<Sayer>().Say("( "+totalAchs[5]+" )",5);
            read();
        }
    }

    public static void EvalFinisher()
    {
		if (CheckAch (totalAchs [6]) == false) {
			achs.Add (totalAchs [6]);
			PlayerMemories.SetList ("achievements", achs);
			GameObject.FindWithTag("aSayer").GetComponent<Sayer>().Say("( "+totalAchs[6]+" )",5);
            read();
		}
    }

    public static bool CheckAch(string what)
    {
        read();
        if (achs.Contains(what.ToLower()))
            return true;
        else
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
            if (string.IsNullOrEmpty(achs[i]))
            {
                achs.RemoveAt(i);
            }
        for (int i = 0; i < achs.Count; i++)
        {
            Debug.Log(achs[i]);
        }

    }
}
