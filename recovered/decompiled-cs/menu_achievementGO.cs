using UnityEngine;
using UnityEngine.UI;

public class menu_achievementGO : MonoBehaviour
{
	private void OnEnable()
	{
		achievements.read();
		for (int i = 0; i < achievements.totalAchs.Count; i++)
		{
			if (achievements.CheckAch(achievements.totalAchs[i]))
			{
				GetComponent<Text>().text += "( UNLOCKED ) ";
			}
			Text component = GetComponent<Text>();
			component.text = component.text + achievements.totalAchs[i] + "\r\n";
		}
		GetComponent<Text>().text += $"\r\n\r\n//Unlocked: {GetNumberString(achievements.HowMany())} out of {GetNumberString(achievements.totalAchs.Count)}";
	}

	private void OnDisable()
	{
		GetComponent<Text>().text = "We're not telling you how you get these achievements.\r\n\r\n";
	}

	private string GetNumberString(int n)
	{
		return n switch
		{
			1 => "one", 
			2 => "two", 
			3 => "three", 
			4 => "four", 
			5 => "five", 
			6 => "six", 
			7 => "seven", 
			8 => "eight", 
			9 => "nine", 
			10 => "ten", 
			_ => "zero", 
		};
	}
}
