using UnityEngine;

public class AttackCone : MonoBehaviour
{
	public Turret turret;

	public bool isLeft;

	private void Awake()
	{
		turret = base.gameObject.GetComponentInParent<Turret>();
	}

	private void OnTriggerStay2D(Collider2D col)
	{
		if (col.CompareTag("plr"))
		{
			if (isLeft)
			{
				turret.Attack(attackingRight: false);
			}
			else
			{
				turret.Attack(attackingRight: true);
			}
		}
	}
}
