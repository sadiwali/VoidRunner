using UnityEngine;
using UnityEngine.UI;

public class scr_play_lvlindicator : MonoBehaviour
{
	private void OnEnable()
	{
		string empty = string.Empty;
		empty = PlayerMemories.GetInt("SPlvlCounter") switch
		{
			0 => "LEVEL ONE (DARK)", 
			1 => "LEVEL TWO (COLD)", 
			2 => "LEVEL THREE (DEATH)", 
			_ => "LEVEL ONE (DARK)", 
		};
		GetComponent<Text>().text = "CURRENT LEVEL: " + empty;
	}
}
