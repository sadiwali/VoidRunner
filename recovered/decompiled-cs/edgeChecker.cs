using UnityEngine;

public class edgeChecker : MonoBehaviour
{
	private void OnTriggerExit2D(Collider2D col)
	{
		if (col.CompareTag("ground"))
		{
			GetComponentInParent<molerat>().saveEdge = true;
		}
	}

	private void OnTriggerEnter2D(Collider2D col)
	{
		if (col.CompareTag("ground"))
		{
			GetComponentInParent<molerat>().saveEdge = false;
		}
	}
}
