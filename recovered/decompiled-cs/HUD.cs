using UnityEngine;
using UnityEngine.UI;

public class HUD : MonoBehaviour
{
	public Sprite[] HeartSprites;

	public Image HeartUI;

	public Player player;

	private void Update()
	{
		if (player != null)
		{
			HeartUI.sprite = HeartSprites[player.curHealth];
		}
	}
}
