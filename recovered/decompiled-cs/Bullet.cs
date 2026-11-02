using UnityEngine;

public class Bullet : MonoBehaviour
{
	public Transform target;

	private Player plr;

	private void Awake()
	{
		target = GameObject.FindWithTag("Turret").GetComponent<Transform>();
		plr = GameObject.FindWithTag("plr").GetComponent<Player>();
	}

	private void Update()
	{
		float num = Vector3.Distance(base.transform.position, target.transform.position);
		if (num > 50f)
		{
			Object.Destroy(base.gameObject);
		}
	}

	private void OnTriggerEnter2D(Collider2D col)
	{
		if (col.CompareTag("plr"))
		{
			col.GetComponent<Player>().Damage(1);
			Object.Destroy(base.gameObject);
		}
		else if (!col.GetComponentInParent<Turret>())
		{
			if ((bool)col.GetComponentInParent<Player>())
			{
				col.GetComponentInParent<Player>().Damage(1);
				Object.Destroy(base.gameObject);
			}
			else if (!col.CompareTag("HealthHeart"))
			{
				Object.Destroy(base.gameObject);
			}
		}
	}
}
