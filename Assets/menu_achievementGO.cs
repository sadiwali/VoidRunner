using UnityEngine;
using System.Collections;
using UnityEngine.UI;

public class menu_achievementGO : MonoBehaviour {

	// Use this for initialization
	void OnEnable () 
    {
        achievements.read();
	    for(int i = 0;i<achievements.totalAchs.Count;i++)
        {
            if(achievements.CheckAch(achievements.totalAchs[i]))
                GetComponent<Text>().text += "( UNLOCKED ) ";

            GetComponent<Text>().text += achievements.totalAchs[i] + "\r\n";
        }
        GetComponent<Text>().text += string.Format("\r\n\r\n//Unlocked: {0} out of {1}", GetNumberString(achievements.HowMany()), GetNumberString(achievements.totalAchs.Count));
	}

    void OnDisable()
    {
        GetComponent<Text>().text = "We're not telling you how you get these achievements.\r\n\r\n";
    }

    string GetNumberString(int n)
    {
        if (n == 1)
            return "one";
        else if (n == 2)
            return "two";
        else if (n == 3)
            return "three";
        else if (n == 4)
            return "four";
        else if (n == 5)
            return "five";
        else if (n == 6)
            return "six";
        else if (n == 7)
            return "seven";
        else if (n == 8)
            return "eight";
        else if (n == 9)
            return "nine";
        else if (n == 10)
            return "ten";
        else
            return "zero";

    }
	
}
