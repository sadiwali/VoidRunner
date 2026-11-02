using UnityEngine;

public class Checkpoint : MonoBehaviour
{
	private void OnTriggerEnter2D(Collider2D col)
	{
		if (col.CompareTag("plr"))
		{
			col.GetComponent<Player>().startPos = base.transform.position;
			GameObject.FindWithTag("Sayer").GetComponent<Sayer>().Say("Checkpoint reached!", 2);
			Object.Destroy(base.gameObject);
		}
	}
}
