using UnityEngine;
using System.Collections;
using UnityEngine.UI;

public class scr_play_lvlindicator : MonoBehaviour {

	// Use this for initialization
	void OnEnable () 
    {
        string s = "";
        switch (PlayerMemories.GetInt("SPlvlCounter"))
        {
            case 0:
                s = "LEVEL ONE (DARK)";
                break;
            case 1:
                s = "LEVEL TWO (COLD)";
                break;
            case 2:
                s = "LEVEL THREE (DEATH)";
                break;
            default:
                s = "LEVEL ONE (DARK)";
                break;

        }

        GetComponent<Text>().text = "CURRENT LEVEL: "+ s;
	
	}
	
}
