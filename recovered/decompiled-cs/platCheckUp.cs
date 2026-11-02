using UnityEngine;

public class platCheckUp : MonoBehaviour
{
	public bool up;

	private void Start()
	{
	}

	private void OnTriggerEnter2D(Collider2D col)
	{
		if (col.CompareTag("ground"))
		{
			if (up)
			{
				GetComponentInParent<molerat>().platUp = true;
			}
			if (!up)
			{
				GetComponentInParent<molerat>().platDown = true;
			}
		}
	}

	private void OnTriggerExit2D(Collider2D col)
	{
		if (col.CompareTag("ground"))
		{
			if (up)
			{
				GetComponentInParent<molerat>().platUp = false;
			}
			if (!up)
			{
				GetComponentInParent<molerat>().platDown = false;
			}
		}
	}
}
