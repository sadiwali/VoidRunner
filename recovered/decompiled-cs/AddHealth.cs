using UnityEngine;

public class AddHealth : MonoBehaviour
{
	private void OnTriggerEnter2D(Collider2D col)
	{
		if (col.CompareTag("plr"))
		{
			Player component = GameObject.FindWithTag("plr").GetComponent<Player>();
			if (component.curHealth < 5)
			{
				component.Health();
				Object.Destroy(base.gameObject);
			}
		}
	}
}
