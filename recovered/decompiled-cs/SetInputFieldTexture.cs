using System.Collections;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

public class SetInputFieldTexture : UIBehaviour
{
	public InputField inputField;

	private new IEnumerator Start()
	{
		yield return null;
		if (inputField == null)
		{
			inputField = GetComponent<InputField>();
		}
		if (inputField != null)
		{
			Transform caretGO = inputField.transform.FindChild(inputField.transform.name + " Input Caret");
			caretGO.GetComponent<CanvasRenderer>().SetMaterial(Graphic.defaultGraphicMaterial, Texture2D.whiteTexture);
		}
	}
}
